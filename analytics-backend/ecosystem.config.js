module.exports = {
  apps: [{
    name: 'analytics-backend',
    script: 'index.js',
    cwd: '/root/Dashboard/analytics-backend',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    log_file: '/root/Dashboard/analytics-backend/analytics-backend.log',
    out_file: '/root/Dashboard/analytics-backend/analytics-backend-out.log',
    error_file: '/root/Dashboard/analytics-backend/analytics-backend-error.log',
    merge_logs: true,
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000
  }]
};
