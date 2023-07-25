function objectSize(object) {
  let size = 0;
  let key;
  for (key in object) {
    if (object.hasOwnProperty(key)) size++;
  }
  return size;
}

module.exports = objectSize;