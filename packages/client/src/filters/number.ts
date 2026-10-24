export default (n: number | bigint | null | undefined) => n == null ? 'N/A' : n.toLocaleString();
