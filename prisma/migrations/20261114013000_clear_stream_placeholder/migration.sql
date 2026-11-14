-- Atualiza o valor placeholder antigo de streamAudioUrl para vazio no SystemConfig
UPDATE `SystemConfig`
SET `value` = ''
WHERE `key` = 'streamAudioUrl' AND `value` = 'https://SEU_STREAM_AQUI';
