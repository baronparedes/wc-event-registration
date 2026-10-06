function escapeOrFilterValue(value) {
  return value.replace(/[,%_]/g, (char) => `\\${char}`);
}

console.log("Normal:", escapeOrFilterValue("hello,world%test_ing"));

function escapeOrFilterValueFix(value) {
  return value.replace(/[\\,%_]/g, (char) => `\\${char}`);
}
console.log("Fix:", escapeOrFilterValueFix("hello\\,world%test_ing"));
