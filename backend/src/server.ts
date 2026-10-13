import { createApp } from "./app.js";
import { config } from "./config.js";
import { migrate } from "./migrate.js";

await migrate();
createApp().listen(config.PORT, () => console.log(`RISE API listening on :${config.PORT}`));
