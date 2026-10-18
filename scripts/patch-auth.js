import fs from 'fs';
import path from 'path';

const targetFile = path.resolve(
  'node_modules/@capacitor-firebase/authentication/android/src/main/java/io/capawesome/capacitorjs/plugins/firebase/authentication/handlers/GoogleAuthProviderHandler.java'
);

if (!fs.existsSync(targetFile)) {
  console.error(`[patch-auth] ERROR: Target file not found at ${targetFile}. Is @capacitor-firebase/authentication installed?`);
  process.exit(1);
}

let content = fs.readFileSync(targetFile, 'utf8');

// 1. Remove requestServerAuthCode in buildGoogleSignInClient to avoid DEVELOPER_ERROR 10
const authCodeRegex = /\.requestServerAuthCode\(pluginImplementation\.getPlugin\(\)\.getContext\(\)\.getString\(R\.string\.default_web_client_id\)\)\r?\n/g;
let replacedAuthCode = false;

if (authCodeRegex.test(content)) {
  content = content.replace(authCodeRegex, '');
  replacedAuthCode = true;
} else if (!content.includes('requestServerAuthCode')) {
  // Already patched
  replacedAuthCode = true;
}

if (!replacedAuthCode) {
  console.error('[patch-auth] ERROR: Failed to match and strip requestServerAuthCode in GoogleAuthProviderHandler.java');
  process.exit(1);
}

const contextTargetLf = 'credentialManager.getCredentialAsync(\n                pluginImplementation.getPlugin().getContext(),';
const contextTargetCrlf = 'credentialManager.getCredentialAsync(\r\n                pluginImplementation.getPlugin().getContext(),';
const contextPatchedLf = 'credentialManager.getCredentialAsync(\n                pluginImplementation.getPlugin().getActivity(),';
const contextPatchedCrlf = 'credentialManager.getCredentialAsync(\r\n                pluginImplementation.getPlugin().getActivity(),';
const contextActivityLf = 'credentialManager.getCredentialAsync(\n                activity,';
const contextActivityCrlf = 'credentialManager.getCredentialAsync(\r\n                activity,';

let replacedContext = false;
if (content.includes(contextTargetLf)) {
  content = content.replace(contextTargetLf, contextPatchedLf);
  replacedContext = true;
} else if (content.includes(contextTargetCrlf)) {
  content = content.replace(contextTargetCrlf, contextPatchedCrlf);
  replacedContext = true;
} else if (
  content.includes(contextPatchedLf) ||
  content.includes(contextPatchedCrlf) ||
  content.includes(contextActivityLf) ||
  content.includes(contextActivityCrlf)
) {
  // Already using Activity context
  replacedContext = true;
}

if (!replacedContext) {
  console.error('[patch-auth] ERROR: Failed to patch credentialManager.getCredentialAsync context in GoogleAuthProviderHandler.java');
  process.exit(1);
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully validated and patched GoogleAuthProviderHandler.java for Android Google Sign-In reliability.');
