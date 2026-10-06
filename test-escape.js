function escapeOrFilterValue(value) {
  return value.replace(/[\\%_,]/g, (char) => `\\${char}`);
}
console.log(escapeOrFilterValue("\\,status.eq.published"));
console.log(escapeOrFilterValue("%_hello"));
