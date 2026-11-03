declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_AVAILABILITY_ENDPOINT?: string;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};
