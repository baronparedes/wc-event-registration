const url = new URL('/\\example.com', 'http://localhost');
console.log(url.href);
const url2 = new URL('/\\/example.com', 'http://localhost');
console.log(url2.href);
