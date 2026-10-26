import { assetUrl } from "../src/urls";
import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";
export default function Html({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#0B2823" />
        <meta
          name="description"
          content="Your private prayer companion. Accurate local prayer times, Qibla and a palette that feels like you. Works offline."
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Bangi" />
        <link rel="manifest" href={assetUrl("manifest.webmanifest")} />
        <link rel="apple-touch-icon" href={assetUrl("apple-touch-icon.png")} />
        <ScrollViewStyleReset />
        <style>{`html,body,#root{height:100%;background:#0B2823}body{overscroll-behavior-y:none}*:focus-visible{outline:2px solid currentColor;outline-offset:3px}`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
