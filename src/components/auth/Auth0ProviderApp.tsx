import { AppState, Auth0Provider } from "@auth0/auth0-react";
import { FC } from "react";
import { useNavigate } from "react-router";

const VITE_AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN;
const VITE_AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID;
const VITE_AUTH0_CALLBACK_URL = import.meta.env.VITE_AUTH0_CALLBACK_URL;

type Props = {
  children: JSX.Element;
};

export const Auth0ProviderApp: FC<Props> = ({ children }) => {
  const navigate = useNavigate();

  console.log('🔐 Auth0ProviderApp inicializando...');
  console.log('🔐 Variables de entorno Auth0:', {
    domain: VITE_AUTH0_DOMAIN,
    clientId: VITE_AUTH0_CLIENT_ID ? 'Definido' : 'No definido',
    callbackUrl: VITE_AUTH0_CALLBACK_URL,
  });

  const onRedirectCallback = (appState: AppState | undefined) => {
    console.log('🔄 Auth0 redirect callback:', appState);
    navigate(appState?.returnTo || "/");
  };

  if (!(VITE_AUTH0_DOMAIN && VITE_AUTH0_CLIENT_ID && VITE_AUTH0_CALLBACK_URL)) {
    console.error('❌ Variables de Auth0 no configuradas correctamente');
    return (
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        color: 'red',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h2>Error de configuración Auth0</h2>
        <p>Variables de entorno requeridas no están configuradas:</p>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>VITE_AUTH0_DOMAIN: {VITE_AUTH0_DOMAIN || '❌ No definido'}</li>
          <li>VITE_AUTH0_CLIENT_ID: {VITE_AUTH0_CLIENT_ID ? '✅ Definido' : '❌ No definido'}</li>
          <li>VITE_AUTH0_CALLBACK_URL: {VITE_AUTH0_CALLBACK_URL || '❌ No definido'}</li>
        </ul>
      </div>
    );
  }

  // Utilizar el Client ID específico para el Dashboard

  const dashboardClientId = "xqx0Cur0tN0vvDgxgB83ZYn2bJo3ev4c";
  
  // Usar un audience fijo para evitar problemas de variables de entorno
  const fixedAudience = "https://buensabor/";

  console.log('✅ Auth0ProviderApp configurado correctamente');

  return (
    <>
      <Auth0Provider
        domain={VITE_AUTH0_DOMAIN}
        clientId={dashboardClientId || VITE_AUTH0_CLIENT_ID}
        authorizationParams={{
          audience: fixedAudience,
          redirect_uri: VITE_AUTH0_CALLBACK_URL,
          scope: 'openid profile email',
        }}
        onRedirectCallback={onRedirectCallback}
        cacheLocation="localstorage"
        useRefreshTokens={true}
        useRefreshTokensFallback={true}
      >
        {children}
      </Auth0Provider>
    </>
  );
};
