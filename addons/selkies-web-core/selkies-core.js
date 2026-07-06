/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import webrtc from "./selkies-wr-core";
import websockets from "./selkies-ws-core";

const STREAM_MODE_WEBRTC = "webrtc";
const STREAM_MODE_WEBSOCKETS = "websockets";

// Storage key namespace: origin + pathname only, NOT the full URL. The query string
// carries a per-session token, so keying on href leaks a new localStorage namespace
// every session and eventually exhausts the quota. Must match selkies-ws-core.js.
const urlForKey = window.location.origin + window.location.pathname;
const storageAppName = urlForKey.replace(/[^a-zA-Z0-9.-_]/g, '_');
const getPrefixedKey = (key) => {return `${storageAppName}_${key}`}
const safeSetItem = (key, value) => {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        console.warn(`Selkies: could not persist '${key}' to localStorage:`, e);
    }
};

// Streaming mode will be injected at build time for initial mode setting
const injectMode = (typeof window !== 'undefined' && window.__SELKIES_STREAMING_MODE__) ? window.__SELKIES_STREAMING_MODE__ : undefined;

let lastSessionMode = localStorage.getItem(getPrefixedKey('stream_mode'));
// Precedence: last session mode > injected mode > default mode
window.streamingMode = lastSessionMode ? lastSessionMode : (injectMode ? injectMode : STREAM_MODE_WEBSOCKETS);
console.log(`Streaming mode set to: ${window.streamingMode}`);

let mode = null;
function switchStreamingMode(newMode) {
    safeSetItem(getPrefixedKey('stream_mode'), newMode);
    switch (newMode) {
        case STREAM_MODE_WEBRTC:
            mode = webrtc();
            mode.initialize();
            break;
        case STREAM_MODE_WEBSOCKETS:
            mode = websockets();
            break;
        default:
            throw new Error(`Invalid client mode: ${window.streamingMode} received, aborting`);
    }
}

window.addEventListener("message", handleMessage)
function handleMessage(event) {
    let message = event.data;
    if (message.mode !== undefined && message.type === "mode") {
        console.log(`Switching streaming mode to: ${message.mode}`);
        safeSetItem(getPrefixedKey('stream_mode'), message.mode);

        // wait for a few seconds to let the server switch modes
        setTimeout(() => {
            // TODO: for now going with a page reload rather than interchaning the modes without reload
            window.location.reload();
        }, 2000)
    }
}

switchStreamingMode(window.streamingMode);
