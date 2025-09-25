import { InputData, AuthData } from '../Data/InputData.js';

// Centralized SDK environment configuration
const s3Config = {
    s3: {
        endpoint: { url: process.env.AIOZ_ENDPOINT || InputData.Url_Production }, //Url_Staging or Url_Production
        region: process.env.AIOZ_REGION || 'us-east-1',
        forcePathStyle: (process.env.AIOZ_FORCE_PATH_STYLE ?? "true").toLowerCase() === "true",
    },
    defaultTTLHours: parseInt(process.env.AIOZ_TTL_HOURS || AuthData.ttlHours, 10),
};


export { s3Config };



