const express = require('express');
const { exec } = require('child_process');
const util = require('util');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'abc';

// Middleware para parsing JSON
app.use(express.json());

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Token de acesso requerido',
      message: 'Forneça o token no header Authorization: Bearer <token>' 
    });
  }

  if (token !== AUTH_TOKEN) {
    return res.status(403).json({ 
      error: 'Token inválido' 
    });
  }

  next();
};

// Função para executar comandos SSH
const executeSSHCommand = (sshConnection, command) => {
  return new Promise((resolve, reject) => {
    // Monta o comando SSH completo
    const fullCommand = `${sshConnection} "${command}"`;
    
    console.log(`Executando: ${fullCommand}`);
    
    exec(fullCommand, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error(`Erro na execução: ${error.message}`);
        reject({
          error: 'Erro na execução do comando SSH',
          message: error.message,
          code: error.code
        });
        return;
      }

      resolve({
        success: true,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        command: command,
        ssh_connection: sshConnection
      });
    });
  });
};

// Endpoint principal para executar comandos SSH
app.post('/execute', authenticateToken, async (req, res) => {
  try {
    const { ssh_connection, command } = req.body;

    // Validação dos parâmetros
    if (!ssh_connection || !command) {
      return res.status(400).json({
        error: 'Parâmetros obrigatórios ausentes',
        message: 'ssh_connection e command são obrigatórios',
        example: {
          ssh_connection: 'ssh root@213.173.99.40 -p 13542 -i ~/.ssh/id_ed25519',
          command: 'ls -la'
        }
      });
    }

    // Validação básica do formato SSH
    if (!ssh_connection.startsWith('ssh ')) {
      return res.status(400).json({
        error: 'Formato de conexão SSH inválido',
        message: 'ssh_connection deve começar com "ssh "',
        example: 'ssh root@213.173.99.40 -p 13542 -i ~/.ssh/id_ed25519'
      });
    }

    // Executa o comando SSH
    const result = await executeSSHCommand(ssh_connection, command);
    
    res.json(result);

  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message || 'Erro desconhecido',
      details: error
    });
  }
});

// Endpoint de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'SSH Command API'
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    message: 'Use POST /execute para executar comandos SSH',
    available_endpoints: {
      'POST /execute': 'Executa comandos SSH (requer autenticação)',
      'GET /health': 'Status da API'
    }
  });
});

// Middleware de tratamento de erros global
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: 'Ocorreu um erro inesperado'
  });
});

// Inicia o servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API SSH rodando na porta ${PORT}`);
  console.log(`📡 Endpoint: POST /execute`);
  console.log(`🔐 Token de autenticação: ${AUTH_TOKEN ? 'Configurado' : 'NÃO CONFIGURADO - Defina AUTH_HEADER'}`);
  console.log(`💊 Health check: GET /health`);
});

module.exports = app;