import React from 'react';

/*
 * Here is a simple example of a function to help
 * explain props.
 * 
 * We can define functions in two ways:
 * - const functionName = (args) => { };
 * - function function(args) { ... };
 * 
 * I will use the const method of definining a
 * function here.
 * We will include two arguments (or parameters)
 * in the function, named `a` and `b`.
 */
const add = (a, b) => {
  const sum = a + b;
  return sum;
}

// Here is an implementation of the function.
const num1 = 4;
const num2 = 6;
const sum = add(num1, num2);


////////////////////////////////

/*
 * Here is an example of a COMPONENT that is defined
 * the same as a function, but is used to render thing
 * to our screen.
 * 
 * This is where we experience weirdness
 * from React syntax through loop holes in JavaScript.
 * 
 * We define a component the same way we do a function.
 * Example: const Homepage = () => { ... }
 * 
 * Some differences in components vs normal functions are:
 * - We capitalize the first character of the name (homepage -> Homepage)
 * - We return a "view" which is HTML-like syntax
 * - Some other things we will get to later (types)
 * 
 * I will define a simple component that returns a simple text view
 * using built-in html. I will explain these concepts afterward:
 * - `interface Props { ... }`
 * - `ComponentName: React.FC<Props>`
 */

interface Props {
  mileage: Number;
  name: String;
}

const HelloWorld: React.FC<Props> = ({}) => {

}
