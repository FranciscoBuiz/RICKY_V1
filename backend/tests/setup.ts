try {
  process.loadEnvFile('.env.test');
} catch {
  // En CI las variables vienen del entorno; que no exista el archivo no es un error.
}
