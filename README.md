# RaasWeb

RaaS is a remote-access system for robots, enabling users to rent time on robot systems, control them,
view telemetry, and more, without being physically present, using a web-based interface.

This is a monorepo for the RaaS project web clients, which includes the lab client, user client, and shared libraries.

These clients use [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) for communication, a peer-to-peer protocol in which, after an initial negotiation assisted
by a remote server, peers connect to each other directly and exchange securely encrypted streams of media (audio, video, etc.) and data.

## Contents

- `lab-client`: The lab client, which runs on a LAN with the robots on the lab server, and is responsible for
connecting with the robots & relaying control commands/sensor data to & from the user client.
- `user-client`: The user client, which runs on the user's computer, and is responsible for
displaying the sensor data from, and sending control commands to, the lab client.
- `libs`: Shared libraries for the lab & user clients.

## Tooling

[Yarn](https://yarnpkg.com/getting-started) is used as our package manager.
[Vite](https://vitejs.dev/guide/) is used as our build tool.
[NX](https://nx.dev/getting-started/intro) is used to manage the monorepo.

Aside from that, the UI is built with [React](https://react.dev/), and all client code is written in [Typescript](https://www.typescriptlang.org/).

[Here is an intro to how we're using NX to manage this monorepo](https://nx.dev/getting-started/tutorials/react-monorepo-tutorial?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects)-- you can run `npx nx graph` to visually explore what was created. Now, let's get you up to speed!

## Dev Setup

Both clients can be run locally. You'll need to do the following first:

- install node [using nvm](https://nodejs.org/en/download/package-manager)
- install yarn with `npm install -g yarn`
- run `yarn` in the root to install dependencies
- add `.env` files to the `lab-client` and `user-client` directories, using the `.env.example` files as templates.
  You may use your own AWS credentials, or use static credentials for the raas-test user in IAM.

## Run tasks

To run the dev servers for the lab & user clients, respectively, run:

```sh
npx nx serve lab-client
npx nx serve user-client
```

To create a production bundle for the clients, run:

```sh
npx nx build lab-client --prod
npx nx build user-client --prod
```

To run that build locally, (i.e. so you can test how the site behaves once it's bundled for production, but locally) run:

```sh
npx nx preview lab-client
npx nx preview user-client
```

To see all available targets to run for a project, run:

```sh
npx nx show project lab-client
npx nx show project user-client
```

These targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## NX Info

### Add new projects

While you could add new projects to your workspace manually, you might want to leverage [Nx plugins](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) and their [code generation](https://nx.dev/features/generate-code?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) feature.

Use the plugin's generator to create new projects.

To generate a new application, use:

```sh
npx nx g @nx/react:app demo
```

To generate a new library, use:

```sh
npx nx g @nx/react:lib mylib
```

You can use `npx nx list` to get a list of installed plugins. Then, run `npx nx list <plugin-name>` to learn about more specific capabilities of a particular plugin. Alternatively, [install Nx Console](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) to browse plugins and generators in your IDE.

[Learn more about Nx plugins &raquo;](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) | [Browse the plugin registry &raquo;](https://nx.dev/plugin-registry?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

[Learn more about Nx on CI](https://nx.dev/ci/intro/ci-with-nx#ready-get-started-with-your-provider?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

### Useful links

Learn more:

- [Learn more about this workspace setup](https://nx.dev/getting-started/tutorials/react-monorepo-tutorial?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects)
- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
