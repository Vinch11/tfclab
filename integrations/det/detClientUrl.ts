declare const __DET_CLIENT_PATH__:string;

export function detClientUrl() {
  return new URL(__DET_CLIENT_PATH__,window.location.origin).href;
}
