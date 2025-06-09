# Redmine Logger

Redmine Tracker is a cross-platform application built using Electron and React. It allows users to track
and manage tasks in Redmine and Jira project management systems.
The application is available for Windows, macOS or Linux.

## Features

- Connects to Redmine and Jira project management systems.
- Tracks and manages tasks, issues, and projects.
- Provides a user-friendly interface for interacting with the project management systems.

## Use already builded application for your Windows/Mac:

1. Open builds folder on google drive and download file accordiong to your OS 
https://drive.google.com/drive/folders/1GCbwj4CgdgjDnx6Ymo3wRZXMXSZgMIj0?usp=sharing
 
2. Unarhive and install downloaded file.

##  Or install according to your requirments:

To install and run the Redmine Tracker application on your platform, follow these steps:

1. Clone the GitHub repository:

```bash
git clone https://github.com/Misyuk-T/redmine-application.git
```

2. Make sure that u have Node.js >= v16.0.0 and yarn >= v1.22.19

```bash
node --version && yarn --version
```

3. Install dependency

```bash
yarn install
```

4. Build electron app with necessary flag: --win --mac or --linux

```bash
yarn build --mac
```

5. Run app
```bash
yarn electron
```

# Troubleshoot

### `yarn` is not installed  
```bash
npm i --global yarn
```
