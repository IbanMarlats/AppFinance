console.log("Start Debug");
try {
    const { v4 } = await import('uuid');
    console.log("UUID loaded", v4());

    const db = await import('./db.js');
    console.log("DB loaded");

    const service = await import('./services/recapService.js');
    console.log("Service loaded");

} catch (e) {
    console.error("Error:", e);
}
