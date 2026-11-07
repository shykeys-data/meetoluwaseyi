// Startup file for the host's Node.js app manager (CloudLinux / Passenger).
// Passenger loads startup files with require(), and the app is an ES module,
// so this file only hands over to the built server with a dynamic import.
import('./dist/server/index.js').catch((err) => {
  console.error('Failed to start meetoluwaseyi:', err);
  process.exit(1);
});
