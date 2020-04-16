module.exports = {
  apps : [{
    name   : "hgbackend",
    cwd    : "server",
    script : "server.js",
    description: "",
    instances  : 1,
    exec_mode  : "cluster",
    env: {
          "NODE_ENV": "staging",
	  "DB_URL": "mongodb+srv://honey:honey123@cluster0-kwqu8.mongodb.net/honey?retryWrites=true&w=majority",
	  "DATABASE": "honey",
	  "USER": "honey",
	  "PASSWORD": "honey123",
	  "SECRET": "GnTCXogXYRm3tLEclR+OrU7B8EHpIxXgkpSAVJazp30vCy8bEr3+bPxY0Ya91JOTf0TlOzystxdMmwhEOOFffGovo6BTUfTq1YOxTLKq5VvfIDDpBxu5mmErq8MQ/Cz1neoOp5P/YFbbFlo7J8u4PUOLUoAhame0DdybAbyCHIgjZPj4+MBzCcqgl2ZHXAci9wMeZvAWNJbLbnMjXQNmqMgLUnatFB0m7ZkYQPuDBXmRGsbSsAuScsdzbsiRE94hBTDVjo2IprH/y9vWDXSzNHqiupXdoamNmR+Tbf/Ed4NV2iEIZAomFJlUX7Wl8ZvU7Dxrnfq+1lb9q6mtOnNY4w==",
	  "FIREBASE_AUTH_TOKEN": "key=AAAA9p0kyko:APA91bHX9CTuywLOIDwXsJ3x_uO644zxNn3QgMtrUI3LHka_EOAE6bdo13yoPf-eJ6NYUXdr7LDjoMOD5A8GpXyz1lShCOoVhdLb8g1FHVhg8VNA56LykNdrcZ3K69ieTAV-VCn3oTc9",
	  "API_TOKEN": "AAAAS9_sZmE:APA91bEf6bX2mtkdXGnTCXogXYRm3tLEclR+OrU7B8EY0Ya91JOTf0TlOPQGtOpGmzhtSbg",
	  "AWS_SECURITY": {
      			"accessKeyId":"AKIAJZAFDWNEYJEHS7CQ",
      			"secretAccessKey":"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",
      			"region":"us-east-2"
    	  },
	  "AWS_SECURITY_SES": {
    				"accessKeyId": "AKIAJRV5H6OFGQGHP7HA",
    				"secretAccessKey": "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",
    				"region": "us-east-1"
  	  },
	  "SES_CONFIG": {
    			"Version": "2012-10-17",
    			"Statement": [{ "Effect": "Allow", "Action": "ses:SendEmail", "Resource": '*' }]
  	  },
	  "BRAINTREE_CONFIG": {
    				"merchantId":   "5p2rt8tbrbj5g4ms",
    				"publicKey":    "ftyw2z9tdhfp4w7j",
    				"privateKey":   "b82e6fb9c453a76e3e7a00b796149578"
  	  },
	  BLOCK_CHAIN_URL: "http://52.15.199.145:3003/api/",
	  ETHEREUM_ADMIN_WALLET_ADDRESS: "0x4b35C164dA3649cE495305C80fcf1d3Ac13a4154",
	  ETHEREUM_ADMIN_WALLET_PRIVATE_KEY: "0x6A91453DAFCFE1CE242497590BE69CDFFD3FE7E5F833914E330268C4ED7DFADA",
	  ETHEREUM_ADMIN_WALLET_PRIVATE_KEY_WITHOUT_PREFIX: "6A91453DAFCFE1CE242497590BE69CDFFD3FE7E5F833914E330268C4ED7DFADA"
    }
  }

]}
