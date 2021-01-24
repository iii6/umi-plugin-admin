import React, { useState, useEffect } from "react";
import { ApplyPluginsType, useModel } from "umi";
import { plugin } from "@@/core/umiExports";
import LayoutComponent from '{{{ path }}}';

export default props => {
  const [runtimeConfig, setRuntimeConfig] = useState(null);
  const initialInfo = (useModel && useModel("@@initialState")) || {
    initialState: undefined,
    loading: false,
    setInitialState: null
  }; // plugin-initial-state 未开启
  useEffect(() => {
    const useRuntimeConfig =
      plugin.applyPlugins({
        key: "admin",
        type: ApplyPluginsType.modify,
        initialValue: initialInfo
      }) || {};
    if (useRuntimeConfig instanceof Promise) {
      useRuntimeConfig.then(config => {
        setRuntimeConfig(config);
      });
      return;
    }
    setRuntimeConfig(useRuntimeConfig);
  }, [initialInfo?.initialState]);
  const userConfig = {
    ...{{{ userConfig }}},
    ...runtimeConfig || {}
  };
  if(!runtimeConfig){
    return null
  }
  return React.createElement(LayoutComponent, {
    userConfig,
    ...props
  });
};
