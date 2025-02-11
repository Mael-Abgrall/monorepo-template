declare global {
  namespace NodeJS {
    // eslint-disable-next-line unicorn/prevent-abbreviations -- not our code
    interface ProcessEnv {
      DATABASE_URL?: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
