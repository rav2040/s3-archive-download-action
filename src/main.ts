import type { Readable, Writable } from "stream";

import { posix } from "path";
import { getInput, setFailed } from "@actions/core";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { extract } from "tar";

const s3 = new S3Client({});

async function main() {
    try {
        const bucket = getInput("bucket", { required: true });
        const name = getInput("name", { required: true });
        const prefix = getInput("prefix");

        console.info("Downloading...");

        const interval = setInterval(() => console.info("Still downloading..."), 5000);

        const response = await s3.send(new GetObjectCommand({
            Bucket: bucket,
            Key: posix.join(prefix, name),
        }));

        if (response.$metadata.httpStatusCode === 200 && response.Body !== undefined) {
            const writeStream = extract({ cwd: process.cwd() });
            await asyncPipe(response.Body as Readable, writeStream);
            clearInterval(interval);
            console.info("Download complete.");
        }
    } catch (err) {
        console.info("Download failed.")
        if (err instanceof Error) setFailed(err);
    }
}

function asyncPipe(readStream: Readable, writeStream: Writable) {
    return new Promise<void>((resolve, reject) => {
        readStream.on("error", reject);
        writeStream.on("error", reject);
        writeStream.on("close", resolve);
        readStream.pipe(writeStream);
    });
}

main();
