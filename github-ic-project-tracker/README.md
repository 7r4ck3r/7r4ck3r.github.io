# IC GitHub Project Tracker

一个面向 IC / EDA / RTL / verification / layout/backend / computer architecture 的 GitHub 开源项目检索页面。

## 使用

直接打开 `index.html`，或部署到 GitHub Pages。

如果使用 GitHub Pages，仓库包含 `.github/workflows/pages.yml`，推送到 `main` 分支后会通过 GitHub Actions 发布静态页面。仓库 Settings 中的 Pages source 需要选择 `GitHub Actions`。

页面会调用 GitHub Search API：

- 默认按 `EDA Flow` 方向检索；
- 支持关键词、语言、最低 stars、更新时间和 archived 过滤；
- 支持按 stars、forks、更新时间和本地相关度评分排序；
- 关注清单保存在浏览器 `localStorage`；
- GitHub Token 是可选项，只保存在当前页面标签页的输入框中。

## 检索方向

- `Analog IC`: analog / CMOS / opamp / ADC / DAC / PLL / LDO
- `Digital RTL`: RTL / Verilog / SystemVerilog / ASIC / FPGA
- `EDA Flow`: EDA / VLSI / OpenLane / Yosys / KLayout / Magic
- `Verification`: verification / UVM / cocotb / testbench / formal
- `Layout/PDK`: layout / PDK / SKY130 / GF180 / DRC / LVS / PEX
- `CPU/RISC-V`: RISC-V / processor / CPU / cache / SoC

默认查询使用较具体的 IC / EDA 关键词组合。手动输入关键词后，页面会优先使用用户关键词，并继续用所选方向做本地相关度评分。

## 注意

未登录 GitHub API 的 Search rate limit 较低。如果检索失败提示 rate limit，可以临时填入 GitHub Token 后重试。
