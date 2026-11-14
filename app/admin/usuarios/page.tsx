import React from 'react';
import { prisma } from '@/lib/prisma';
import { verifyAdminSession } from '@/lib/auth';
import UserList from './UserList';

export const dynamic = 'force-dynamic';

export default async function AdminUsuariosPage() {
  const admin = await verifyAdminSession();

  const users = await prisma.adminUser.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      // NUNCA expõe passwordHash
    },
    orderBy: { createdAt: 'asc' },
  });

  const userIds = users.map((u) => u.id);
  const loginLogs = await prisma.auditLog.findMany({
    where: {
      userId: { in: userIds },
      action: 'login',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      userId: true,
      createdAt: true,
    },
  });

  const lastLoginMap: Record<string, Date> = {};
  for (const log of loginLogs) {
    if (log.userId && !lastLoginMap[log.userId]) {
      lastLoginMap[log.userId] = log.createdAt;
    }
  }

  const userItems = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    lastLogin: lastLoginMap[u.id] || null,
    isCurrentAdmin: u.id === admin.id,
  }));

  return (
    <div className="admin-page-container">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Gestão de Administradores</h1>
          <p className="admin-page-description">
            Visualize as contas administrativas com acesso ao sistema e remova acessos indevidos ou duplicados.
          </p>
        </div>
      </div>

      <UserList users={userItems} totalAdmins={users.length} />
    </div>
  );
}
