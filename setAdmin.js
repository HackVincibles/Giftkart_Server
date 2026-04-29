const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://adityathakre976_db_user:aUo0YxLuQ4ZgctyO@mycluster.dwgudl0.mongodb.net/giftKart')
.then(() => mongoose.connection.db.collection('users').updateOne({email: 'adithakre0@gmail.com'}, { $set: { role: 'admin' } }))
.then((res) => { console.log('Updated user to admin:', res.modifiedCount); process.exit(0); })
.catch(err => { console.error(err); process.exit(1); });
