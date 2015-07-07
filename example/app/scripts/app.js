function test() {
  this.a = 'hello';

  () => {
    return `${this.a}, world`;
  };
}