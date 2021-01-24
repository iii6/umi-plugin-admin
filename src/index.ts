import { IApi, utils } from 'umi';
import { join } from 'path';
import { LayoutConfig } from './types';
import { readFileSync, copyFileSync, statSync } from 'fs';
import * as allIcons from '@ant-design/icons';

const namespace = 'plugin-admin';

function haveProLayout() {
  try {
    require.resolve('@ant-design/pro-layout');
    return true;
  } catch (error) {
    console.log(error);
    console.error('@umijs/plugin-layout 需要安装 ProLayout 才可运行');
  }
  return false;
}

function toHump(name: string) {
  return name.replace(/\-(\w)/g, function(all, letter) {
    return letter.toUpperCase();
  });
}

function format(data: []) {
  let icons = {};
  (data || []).forEach(item => {
    // @ts-ignore
    const v4IconName = toHump(item.replace(item[0], item[0].toUpperCase()));
    if (allIcons[item]) {
      // @ts-ignore
      icons[v4IconName] = `<${item} />`;
    }
    // @ts-ignore
    if (allIcons[`${v4IconName}Outlined`]) {
      // @ts-ignore
      icons[v4IconName] = `<${v4IconName}Outlined />`
    }
  })

  return icons;
}

export default (api: IApi) => {
  api.describe({
    key: 'admin',
    config: {
      schema(joi) {
        return joi.object()
      },
      onChange: api.ConfigChangeType.regenerateTmpFiles,
    },
    enableBy: api.EnableBy.config,
  });

  api.addDepInfo(() => {
    const pkg = require('../package.json');
    return [
      {
        name: '@ant-design/pro-layout',
        range:
          api.pkg.dependencies?.['@ant-design/pro-layout'] ||
          api.pkg.devDependencies?.['@ant-design/pro-layout'] ||
          pkg.peerDependencies['@ant-design/pro-layout'],
      },
      {
        name: '@umijs/route-utils',
        range: pkg.dependencies['@umijs/route-utils'],
      },
      {
        name: '@ant-design/icons',
        range: pkg.peerDependencies['@ant-design/icons'],
      },
    ];
  });

  let generatedOnce = false;
  api.onGenerateFiles(() => {
    if (generatedOnce) return;
    generatedOnce = true;
    const cwd = join(__dirname, '../src');
    const files = utils.glob.sync('**/*', {
      cwd,
    });
    const base = join(api.paths.absTmpPath!, 'plugin-admin', 'layout');
    utils.mkdirp.sync(base);
    files.forEach(file => {
      if (['index.ts'].includes(file)) return;
      const source = join(cwd, file);
      const target = join(base, file);
      if (statSync(source).isDirectory()) {
        utils.mkdirp.sync(target);
      } else {
        copyFileSync(source, target);
      }
    });
  });

  api.modifyDefaultConfig(config => {
    // @ts-ignore
    config.title = false;
    return config;
  });

  let layoutOpts: LayoutConfig = {};
  api.addRuntimePluginKey(() => ['admin']);

  api.onGenerateFiles(() => {
    const { name } = api.pkg;
    layoutOpts = {
      name,
      theme: 'PRO',
      locale: false,
      showBreadcrumb: true,
      ...(api.config.admin || {}),
    };

    let layoutComponent = {
      // 如果 ProLayout 没有安装会提供一个报错和一个空的 layout 组件
      PRO: haveProLayout()
        ? './layout/layout/index.tsx'
        : './layout/layout/blankLayout.tsx',
    };

    if (layoutOpts.layoutComponent) {
      layoutComponent = Object.assign(
        layoutOpts.layoutComponent,
        layoutComponent,
      );
    }

    const theme = (layoutOpts.theme && layoutOpts.theme.toUpperCase()) || 'PRO';
    // @ts-ignore
    const currentLayoutComponentPath = layoutComponent[theme] || layoutComponent['PRO'];
    const LayoutTpl =  readFileSync(join(__dirname, 'LayoutContent.tpl'), 'utf-8');

    api.writeTmpFile({
      path: join(namespace, 'Layout.tsx'),
      content: utils.Mustache.render(LayoutTpl, {
        path: utils.winPath(currentLayoutComponentPath),
        userConfig: JSON.stringify(layoutOpts).replace(/"/g, "'")
      })
    });

    const iconMap = api.config.admin?.icon || [];
    const icon = format(iconMap);
    // @ts-ignore
    let imports = Object.values(icon).map((name: string) => {
      let icon = name.replace(/<(.*)\s\/>/g, '$1');
      return `import ${icon} from '@ant-design/icons/es/icons/${icon}'`
    })

    api.writeTmpFile({
      path: join(namespace, 'icon.tsx'),
      content: `
${imports.join(';\n')}
const map = ${JSON.stringify(icon).replace(/"/g, '')};
export default map;
      `
    })
  });

  api.modifyRoutes(routes => {
    return [
      {
        path: '/',
        component: utils.winPath(
          join(api.paths.absTmpPath || '', namespace, 'Layout.tsx'),
        ),
        routes,
      },
    ];
  });
};
