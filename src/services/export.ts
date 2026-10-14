export function download(file: string, body: string, mime: string) {
  let url = URL.createObjectURL(new Blob([body], { type: mime })),
    a = document.createElement("a");
  a.href = url;
  a.download = file;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
