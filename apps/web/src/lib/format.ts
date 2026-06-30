export const fmtSize = (b: number) => `${(b / 1024).toFixed(1)} KB`;
export const fmtDate = (iso: string) => new Date(iso).toLocaleString();
