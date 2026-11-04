// V16 regression harness only. Real API calls are forbidden; individual tests may install explicit mocks.
globalThis.fetch=async()=>{throw new Error('DET_V16_OFFLINE_REAL_NETWORK_FORBIDDEN');};
