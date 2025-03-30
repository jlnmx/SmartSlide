# AI Powered PowerPoint Presentation Generator

This project is a web application that utilizes AI to generate PowerPoint presentations. It is built using Flask for the backend and React.js for the frontend.

---

## Project Structure

```
frontend
├── public
│   ├── index.html
│   └── favicon.ico
├── src
│   ├── components
│   │   ├── App.js
│   │   ├── CreatePage.js
│   │   └── GeneratePage.js
│   ├── index.js
│   └── styles
│       ├── App.css
│       ├── CreatePage.css
│       └── GeneratePage.css
├── package.json
├── .gitignore
└── README.md
```

---

## Prerequisites

Before running this project, ensure you have the following installed:

1. **Node.js**:  
   - Download and install Node.js (LTS version recommended, e.g., **v18.x.x**) from the [official Node.js website](https://nodejs.org/).
   - Verify the installation by running:
     ```
     node -v
     ```
     This should output the installed Node.js version.

2. **npm (Node Package Manager)**:  
   - npm is installed automatically with Node.js. Verify it by running:
     ```
     npm -v
     ```

3. **Git**:  
   - Install Git from the [official Git website](https://git-scm.com/).
   - Verify the installation by running:
     ```
     git --version
     ```

---

## Getting Started

To get started with the project, follow these steps:

1. **Clone the repository**:
   ```
   git clone <repository-url>
   ```

2. **Navigate to the frontend directory**:
   ```
   cd frontend
   ```

3. **Install the dependencies**:
   ```
   npm install
   ```

4. **Start the development server**:
   ```
   npm start
   ```

   The app will be available at `http://localhost:3000` in your browser.

---

## Dependencies

The following dependencies are required for this project:

1. **React.js**: A JavaScript library for building user interfaces.
2. **React Router DOM**: For handling routing in the app.
3. **react-scripts**: Provides scripts and configuration for Create React App.
4. **ESLint**: For linting and maintaining code quality.

These dependencies are listed in the `package.json` file and will be installed automatically when you run `npm install`.

---

## Features

- AI-powered presentation generation
- User-friendly interface
- Responsive design

---

## Troubleshooting

1. **Error: `react-scripts` is not recognized**:  
   Run `npm install` to ensure all dependencies are installed.

2. **Error: `ERR_OSSL_EVP_UNSUPPORTED`**:  
   If you encounter this error, ensure you are using Node.js v18.x.x or set the environment variable:
   ```
   set NODE_OPTIONS=--openssl-legacy-provider
   ```

3. **Port Already in Use**:  
   If the default port `3000` is in use, you can specify a different port:
   ```
   set PORT=3001 && npm start
   ```

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or features.

---

## License

This project is licensed under the MIT License. See the LICENSE file for details.