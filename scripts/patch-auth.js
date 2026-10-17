import fs from 'fs';
import path from 'path';

const targetFile = path.resolve('node_modules/@capacitor-firebase/authentication/android/src/main/java/io/capawesome/capacitorjs/plugins/firebase/authentication/handlers/GoogleAuthProviderHandler.java');

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');

  // 1. Remove requestServerAuthCode in buildGoogleSignInClient to avoid DEVELOPER_ERROR 10
  content = content.replace(
    /\.requestServerAuthCode\(pluginImplementation\.getPlugin\(\)\.getContext\(\)\.getString\(R\.string\.default_web_client_id\)\)\r?\n/g,
    ''
  );

  // 2. Ensure Activity context is used in credentialManager.getCredentialAsync
  if (content.includes('credentialManager.getCredentialAsync(\n                pluginImplementation.getPlugin().getContext(),')) {
    content = content.replace(
      'credentialManager.getCredentialAsync(\n                pluginImplementation.getPlugin().getContext(),',
      'credentialManager.getCredentialAsync(\n                pluginImplementation.getPlugin().getActivity(),'
    );
  } else if (content.includes('credentialManager.getCredentialAsync(\r\n                pluginImplementation.getPlugin().getContext(),')) {
    content = content.replace(
      'credentialManager.getCredentialAsync(\r\n                pluginImplementation.getPlugin().getContext(),',
      'credentialManager.getCredentialAsync(\r\n                pluginImplementation.getPlugin().getActivity(),'
    );
  }

  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('Successfully patched GoogleAuthProviderHandler.java for Android Google Sign-In reliability.');
}
