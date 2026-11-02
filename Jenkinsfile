pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                echo 'EcoStream source code checked out from GitHub'
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                dir('server') {
                    bat 'npm install'
                }
            }
        }

        stage('Install Frontend Dependencies') {
            steps {
                dir('client') {
                    bat 'npm install'
                }
            }
        }

        stage('Build React Frontend') {
            steps {
                dir('client') {
                    bat 'npm run build'
                }
            }
        }
    }

    post {
        success {
            echo 'EcoStream pipeline completed successfully!'
        }
        failure {
            echo 'EcoStream pipeline failed. Check the console output.'
        }
    }
}
