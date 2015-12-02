module.exports = [
    ['/', 'index#index']

  , ['/users', 'users#index', 'auth#sessionWithUser', 'get']
  , ['/users', 'users#create', 'post']
  , ['/users/:id', 'users#get', 'auth#sessionWithUser', 'get']
  , ['/users/:id', 'users#update', 'auth#sessionWithUser', 'put']
  , ['/users/login', 'users#login', 'post']
  , ['/users/logout', 'users#logout', 'auth#sessionWithUser', 'delete']
  , ['/users/:id/verify/:key', 'users#verifyEmail', 'get']
];