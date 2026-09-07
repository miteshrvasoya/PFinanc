import type { AppProps } from 'next/app';
import { AuthProvider } from '../context/AuthContext';
import '../styles/globals.css';
import Head from 'next/head';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Head>
        <title>PFinanc — Self-Hosted Personal & Family Finance</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="description" content="A reliable financial ledger and family finance management system with strict auditability and zero double-counting." />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
