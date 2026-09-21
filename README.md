# Landmensure

Calculadora de área e gerador de memorial descritivo a partir de um KML.

## Desenvolvimento

Requer Node.js 22.12 ou mais recente.

```sh
npm ci
npm run dev
```

O endereço mostrado pelo Vite abre a aplicação durante o desenvolvimento.

## Testes e versão de produção

```sh
npm test
npm run build
```

O build fica em `dist/`. Publique **o conteúdo de `dist/`** em uma hospedagem estática. O arquivo `index.html` na raiz é a entrada do projeto para o Vite e precisa ser processado pelo build; abri-lo diretamente como `file://` não carrega os módulos.

## Organização

- `src/geometry.js`: validação do polígono e cálculos UTM.
- `src/memorial.js`: HTML do memorial, sem acesso direto à interface.
- `src/print.js`: folhas de impressão do memorial e do croqui.
- `src/main.js`: mapa, importação e eventos da interface.
- `tests/geometry.test.js`: KML de exemplo e casos inválidos com as bibliotecas reais.

As bibliotecas JavaScript e CSS são incluídas no build local. A imagem de satélite da Esri ainda precisa de internet.

## Android (APK)

O projeto Android fica em `android/` e usa Capacitor 8. Após qualquer alteração no site:

```sh
npm ci
npm test
npm run build
npx cap sync android
```

Abra `android/` no Android Studio e execute a tarefa `assembleDebug` ou, com SDK e Java configurados, use `android/gradlew assembleDebug` (Windows: `android/gradlew.bat assembleDebug`). O APK de teste é gerado em `android/app/build/outputs/apk/debug/app-debug.apk`. Ele é assinado com a chave de depuração e serve para instalar e demonstrar o aplicativo, não para uma publicação oficial.

Cada envio para a branch `main` também executa o workflow **Android APK** no GitHub Actions. Baixe o artefato `landmensure-debug-apk` na execução bem-sucedida. O arquivo gerado é um APK de teste; para distribuir atualizações ou publicar na Play Store, configure uma chave de assinatura própria e gere um AAB de lançamento.

No Android, a prévia de impressão usa um WebView dedicado e chama o serviço de impressão do sistema, que permite imprimir ou salvar em PDF. Confira o memorial e o croqui em um aparelho antes da apresentação, especialmente a paginação A4. A camada de satélite do mapa continua dependendo da conexão com a internet.
