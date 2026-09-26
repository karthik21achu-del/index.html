module.exports = {
  apps: [
    {
      name: 'ecoshield',
      script: 'server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0',
      },
    },
  ],
};
