pipeline {
  agent any
    
  tools {nodejs "node"}
    
  stages {
        
    stage('Cloning Git dev branch') {
        
      steps {
            git branch : 'dev',
            url:'git@bitbucket.org:honeygram/hgbackend.git'
      }
    }
<<<<<<< HEAD
        
    stage('Install dependencies') {
      steps {
        sh 'npm install'
=======
    stage('test'){
      steps{
        sh 'chmod 777 ./node_modules/.bin/mocha'
        sh 'npm uninstall mocha && npm i mocha'
        sh 'npm run test &'
>>>>>>> staging
      }
      
    }
    
    stage('Run Server') {
      steps {
         sh 'npm start &'
      }
    }     
    
   stage('Test') {
     options {
        timeout(time: 1200, unit: 'SECONDS') 
    }
      steps {
         sh 'chmod 777 ./node_modules/.bin/mocha'
         sh 'npm uninstall mocha && npm i mocha'
        // sh 'npm test' 
      }
   post{
        aborted{ 
            slackSend baseUrl: 'https://hooks.slack.com/services/', 
            channel: '#team-devops', 
            color: 'good', 
            failOnError: true, 
            message:"*Success:* Job ${env.JOB_NAME} build ${env.BUILD_NUMBER} by ${env.USER_ID}\n More info at: ${env.BUILD_URL}", 
            teamDomain: 'grammes', 
            tokenCredentialId: 'slack-notifications'
    }
        failure {
            slackSend baseUrl: 'https://hooks.slack.com/services/', 
            channel: '#team-devops', 
            color: 'good', 
            failOnError: true, 
            message:"*FAILED:* Job ${env.JOB_NAME} build ${env.BUILD_NUMBER} by ${env.USER_ID}\n More info at: ${env.BUILD_URL}", 
            teamDomain: 'grammes', 
            tokenCredentialId: 'slack-notifications'
        }
        success {
            slackSend baseUrl: 'https://hooks.slack.com/services/', 
            channel: '#team-devops', 
            color: 'good', 
            message:"*Success:* Job ${env.JOB_NAME} build ${env.BUILD_NUMBER} by ${env.USER_ID}\n More info at: ${env.BUILD_URL}", 
            teamDomain: 'grammes', 
            tokenCredentialId: 'slack-notifications'
            }
        }
    } 
    
    stage('checkout'){
        
         steps {
            checkout scm
        }
        
    }
  }
    

    
  }
