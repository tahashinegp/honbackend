describe('/users', function() {
  var assert = require('chai').assert;
  var server = require('../server/server');
  var request = require('supertest')(server);
  var superagent = require('superagent');
  var user;

  before(function() {
    user = server.models.users;
  });

  // beforeEach(function (done) {
  //     countryCode.upsert({ countryName: "Indonesia",countryCode:"+62"}, function() { done() })
  //})

  //post
  // it('Post a new user', function(done) {
  //   request
  //     .post('/api/users')
  //     .send({ userMail: 'testuser9@gmail.com', password: 'Te@123' })
  //     .expect(200, done);
  //     // .end(function(err, loginRes) {
  //     //   return err ?  done(err): assert.ok(loginRes.body);
  //     // });
  // });

  //Auth
  it('Authorize an user', function(done) {
    request
      .post('/api/authentication')
      .send({"userName":"elahi","password":"Al@123"})
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .end(function(err, loginRes) {
        if (err) {
          return done(err);
        }
        assert.equal(loginRes.status, 200);
        // assert.ok(loginRes.body);
        // assert.equal(loginRes.body.IsExecute, true);
        done();
      });
  });

  // //get
  // it('Get users', function(done) {
  //   request
  //     .get(
  //       'http://localhost:3000/api/users/filter/1/20'
  //     )
  //     .send()
  //     .expect(200, done);
  // });

  // //get One
  // it('Get one user', function(done) {
  //   user.findOne(
  //     {
  //       where: {
  //         userMail: 'testuser5@gmail.com'
  //       }
  //     },
  //     function(err, res) {
  //       console.log(res);
  //       request
  //         .get('/api/users/5bb1b98c1a4a076048e0a1d6')
  //         .send()
  //         .expect(200, done);
  //     }
  //   );
  // });

  // //put
  // it('Put a user', function(done) {
  //   user.findOne(
  //     {
  //       where: {
  //         userName: 'testuser',
  //         userMail: 'testuser@gmail.com',
  //         userPhone: '+880154659858'
  //       }
  //     },
  //     function(err, res) {
  //       request
  //         .put('/api/users/5bb1b98c1a4a076048e0a1d6')
  //         .send({ benefitArrangement: 'testuser' })
  //         .expect(200, done);
  //     }
  //   );
  // });

  // //delete
  // it('Delete a user', function(done) {
  //   user.findOne(
  //     {
  //       where: {
  //         userName: 'testuser',
  //         userMail: 'testuser@gmail.com',
  //         userPhone: '+880154659858'
  //       }
  //     },
  //     function(err, res) {
  //       request
  //         .delete('/api/users/' + res.id)
  //         .send()
  //         .expect(200, done);
  //     }
  //   );
  // });

  // //Username Exist or not
  // it('IsUserNameExist', function(done) {
  //   superagent
  //     .post('http://localhost:3000/api/users/isusernameexist')
  //     .send({ userName: 'kaysar' })
  //     .set('Accept', 'application/json')
  //     .set('Content-Type', 'application/json')
  //     .end(function(err, loginRes) {
  //       if (err) {
  //         return done(err);
  //       }
  //       assert.equal(loginRes.status, 200);
  //       assert.ok(loginRes.body);
  //       assert.equal(loginRes.body.IsExecute, true);
  //       done();
  //     });
  // });

  // //Email Exist or not
  // it('IsEmailExist', function(done) {
  //   superagent
  //     .post('http://localhost:3000/api/users/ismailexist')
  //     .send({ userMail: 'nhs047@gmail.com' })
  //     .set('Accept', 'application/json')
  //     .set('Content-Type', 'application/json')
  //     .end(function(err, loginRes) {
  //       if (err) {
  //         return done(err);
  //       }
  //       assert.equal(loginRes.status, 200);
  //       assert.ok(loginRes.body);
  //       assert.equal(loginRes.body.IsExecute, true);
  //       done();
  //     });
  // });

  // //Phone Number Exist or not
  // it('IsUserPhoneExist', function(done) {
  //   superagent
  //     .post('http://localhost:3000/api/users/isphoneexist')
  //     .send({ userPhone: '+880168554158151' })
  //     .set('Accept', 'application/json')
  //     .set('Content-Type', 'application/json')
  //     .end(function(err, loginRes) {
  //       if (err) {
  //         return done(err);
  //       }
  //       assert.equal(loginRes.status, 200);
  //       assert.ok(loginRes.body);
  //       assert.equal(loginRes.body.IsExecute, true);
  //       done();
  //     });
  // });

  // //Mail verification Exist or not
  // it('MailVerification', function(done) {
  //   this.timeout(500000);
  //   superagent
  //     .post('http://localhost:3000/api/users/mailverification')
  //     .send({
  //       name: 'Era InfoTech Limited',
  //       sendTo: 'testmailerainfotech@gmail.com'
  //     })
  //     .set('Accept', 'application/json')
  //     .set('Content-Type', 'application/json')
  //     .end(function(err, loginRes) {
  //       if (err) {
  //         return done(err);
  //       }
  //       assert.equal(loginRes.status, 200);
  //       assert.ok(loginRes.body);
  //       assert.equal(loginRes.body.IsExecute, true);
  //       done();
  //     });
  // });

  // //Code Verifier
  // it('Verification hexcode from mail', function(done) {
  //   this.timeout(500000);
  //   superagent
  //     .post('http://localhost:3000/api/users/codeverifier')
  //     .send({
  //       hexCode:
  //         'eab7c84d659cff8d882252ea3e39951c5e4ea482d4b3ea4c803199214262d200aecb3a1d915961cfa60545cb7db2848a7333ee9f174870ddb85df9fa7f0bd1b075'
  //     })
  //     .set('Accept', 'application/json')
  //     .set('Content-Type', 'application/json')
  //     .end(function(err, loginRes) {
  //       if (err) {
  //         return done(err);
  //       }
  //       assert.equal(loginRes.status, 200);
  //       assert.ok(loginRes.body);
  //       assert.equal(loginRes.body.IsExecute, true);
  //       done();
  //     });
  // });

  // //get limited users with page & limit
  // it('get users with limit & page & userId', function(done) {
  //   this.timeout(500000);
  //   superagent
  //     .post('http://localhost:3000/api/users/getlimitedusers/')
  //     .send({ page: 1, limit: 2, userId: '5b3b12a10bfcb110244ea4f9' })
  //     .set('Accept', 'application/json')
  //     .set('Content-Type', 'application/json')
  //     .end(function(err, loginRes) {
  //       if (err) {
  //         return done(err);
  //       }
  //       assert.equal(loginRes.status, 200);
  //       assert.ok(loginRes.body);
  //       assert.equal(loginRes.body.IsExecute, true);
  //       done();
  //     });
  // });
});
