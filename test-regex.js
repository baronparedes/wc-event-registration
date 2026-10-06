function escapeOrFilterValue(value) {
  return value.replace(/[,%_]/g, (char) => `\\${char}`);
}
console.log(escapeOrFilterValue("test%"));
console.log(escapeOrFilterValue("test\\%"));
