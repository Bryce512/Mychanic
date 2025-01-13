import React from 'react';
import {Text, View} from 'react-native';

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
const add = (a: number, b: number) => {
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
  name: String;
  mileage: Number;
}

// Notice how the contents within Props and the arguments below
// are always the same.
// Also notice how the arguments here are in curly braces (unlike
// normal functions).
const HelloUser: React.FC<Props> = ({ name, mileage }) => {
  // To do a multi-line return, we must use parentheses
  return (
    // If we are returning multiple components within our HelloUser component,
    // we must wrap them into a container. Here, for example, we will use a
    // <View></View> to display a "Hello, [name]", followed by their mileage.
    <View>
      {/* This how you now do comments within HTML */}

      {/* Here we create text components to display our input props (mileage, name)! */}
      <Text>{"Hello, " + name}</Text>
      <Text>{"Your mileage is " + mileage}</Text>
    </View>
  );

  // We have successfully implemented PROPS in a component. Let's now address:
  // - `interface Props { ... }`
  // - `ComponentName: React.FC<Props>`
}

/**
 * Props
 * 
 * In JavaScript, there are NO types. Thats why we use TYPEscript.
 * This is why we have .ts or .tsx files. We want TYPES because they
 * help reduce errors and make our code more clear (as annoying as
 * they are).
 * 
 * `Props` is just a type we are defining. We DEFINE types by using
 * the `interface` keyword.
 * Example: `interface Props = { ... }`
 * 
 * "interface" is they keyword to define a type.
 * "Props" is the name of our type.
 * Now let us dive into the contents. Spoiler: pretty simple.
 * 
 * The contents of our Props type will basically contain a list of
 * what we want `Props` to always contain.
 * 
 * Let's take a step back and define what "Props" are. Props is the house
 * for the information we want to be passed in- from the outside- to the
 * inside of our component. Just like the `name`, and `mileage` props, right?
 * Similar to how functions accept needed arguments, Props are those needed
 * arguments.
 * 
 * So, this `Props` type is telling our component what information it needs
 * to be complete. Defining the contents is simple. Each line is a variable
 * name, assigned to a type. Here are the built-in types:
 * - any (This type is cheating, because it says the type can be anything)
 * - number (Any numerical value)
 * - string (Any character-based value like words or sentences)
 * - boolean (True or false value)
 * - null (no value)
 * - undefined (no value)
 * - void (no value)
 * ...and there are others but those are the basics you'll work with.
 * 
 * A good rule of thumb is that if the type does not match any of the basic
 * types such as number, string, boolean, or undefined, then use "any".
 * 
 * Here is the example above repeated but with an extra property.
 */

// Notice how there is no equal sign in type declaration.
interface Props {
  name: String; // Each type is concluded with a semicolon
  mileage: Number;
  
  // Here is an example of a property within our type that
  // cannot be so easily defined. The "theme" property is
  // an advanced object that we haven't built out into its
  // own type so we lazily call it "any". It's best practice
  // to eventually replace all "any" types with custom-built
  // types.
  theme: any;
}

/**
 * Assigning components to a component type with its corresponding
 * `Props` type.
 * 
 * When we create our component...
 * Example: `const ComponentName: React.FC<Props> = ...`
 * ...we give it the type `React.FC`.
 * - React.FC stands for React.FunctionalComponent
 * - The reason we do `React.` before `FC` is because we imported `React`
 *   at the top of the file and the type is included in the `React` object.
 *   - We could alternatively adjust our `import React from 'react';` to:
 *     `import React, { FC } from 'react';` which would allow us to instead
 *     type our components like this: `const ComponentName: FC<Props> = ...`,
 *     which shortens it by dropping the `React.`. Either way works the same.
 * 
 * Let's sum up this line in English:
 * `const ComponentName: React.FC<Props> = ({ ...props }) => { ... }`
 * 
 * We are declaring a constant (const) function definition (which is actually a component).
 * The type of this component is going to be a React Functional Component (react.FC) that
 * must accept Props (which contain the needed arguments/data) when being invoked. We are
 * going to assign it to (=) the preceeding logic { ... }. Since this is a component, we
 * know to use it in HTML syntax (<ComponentName prop1={prop1} ... />), and we know that
 * when we call it, it will return some sort of visual.
 */

// Props was already created so I have to call this one Props2.
interface Props2 {
  displayText: string;
}

const Component2: React.FC<Props2> = ({ displayText }) => {
  return (
    <View>
      <Text>Since this is pure text, we dont need curly brackets</Text>
      {/* Since this is using logic (variables) and/or its dynamic (variables) */}
      {/* we use curly brackets */}
      <Text>{displayText}</Text>
    </View>
  );
}

// We can now call our Component2 component anywhere within another component to
// see its contents. Example:
const App = () => {
  // ... variables, state, etc...

  return (
    // Since this is the only component, we dont have to nest it inside anything.
    // ...however... it might be nice to nest it in a <View></View> for styling
    // either way.
    <Component2 displayText="Hello, World!" />
    // ^ Notice how no curly brackets were needed because we are not using any
    // logic or variables (which is rare)
  );

  // Alternatively, we could have leveraged a variable which is a commonly used
  // methodology and is what you will normally see in our codebase since we don't
  // use much static data (we used data tailored to the user from their car).
  const displayText = "Hello, World!";
  return (
    <Component2 displayText={displayText} />
  );
}

// That should be it. Let me know if you have any questions :)
