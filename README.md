ROUTES

- every time we fetch a new pair, we inflate the URL
- when we land on the site at '/vote', we fetch a new pair and inflate the URL
- if we land on the site with a pair in the URL, we inflate the UI with that pair

- so a route callback simply initializes a module? maybe there's middleware that initializes/destroys every route handler?

a vote: 
{
  dimension: ObjectID(...dimension...),
  winner: ObjectID(...cause...),
  loser: ObjectID(...cause...)
}
