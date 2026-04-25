# 数字人自定义事件功能说明

## 什么是自定义事件？

数字人自定义事件功能允许您在数字人说话过程中，通过SSML中的 `<uievent>` 标签触发自定义UI事件，实现**多模态内容展示**。例如：展示图片、播放视频、显示链接、展示3D模型等。


## 快速开始

### 1. 在SSML中定义事件

```xml
<speak>
  <uievent>
    <type>show_image</type>
    <data>
      <image>https://example.com/image.jpg</image>
      <title>产品图片</title>
    </data>
  </uievent>
  这是我们的产品图片。
</speak>
```

### 2. 在代码中处理事件

**推荐方式：使用 `proxyWidget`**

```javascript
const avatarInstance = new XmovAvatar({
  containerId: '#avatar-container',
  appId: 'your-app-id',
  appSecret: 'your-app-secret',
  gatewayServer: 'https://your-gateway.com/api/session',
  proxyWidget: {
    show_image: (data) => {
      // 处理图片展示
      displayImage(data.data.image, data.data.title)
    },
    show_video: (data) => {
      // 处理视频播放
    }
  }
})
```

---

## 核心功能

### SDK内置控件（无需处理）

- **字幕控件** (`subtitle_on` / `subtitle_off`): SDK自动处理
- **背景图片控件** (`widget_pic`): SDK自动处理

### 两种回调方式

#### 方式一：proxyWidget（推荐）⭐

**适用场景：** 只需要处理自定义事件

```javascript
proxyWidget: {
  show_image: (data) => {
    // 只处理自定义事件，SDK自动处理字幕和背景图片
  }
}
```

#### 方式二：onWidgetEvent

**适用场景：** 需要完全自定义所有UI渲染

```javascript
onWidgetEvent: (data) => {
  const eventType = data.type
  // 处理所有事件，包括字幕和背景图片
  if (eventType === 'show_image') {
    // 自定义处理逻辑
  }
}
```

**⚠️ 注意：** 两种方式不能同时使用，`onWidgetEvent` 会优先。


## 使用场景

### 场景1：产品展示

```xml
<speak>
  <uievent>
    <type>show_image</type>
    <data>
      <image>https://example.com/product.jpg</image>
      <title>我们的新产品</title>
    </data>
  </uievent>
  这是我们最新推出的产品。
</speak>
```

**应用：** 电商导购、产品介绍


### 场景2：视频教学

```xml
<speak>
  <uievent>
    <type>show_video</type>
    <data>
      <video>https://example.com/tutorial.mp4</video>
      <title>操作教程</title>
    </data>
  </uievent>
  让我为您播放操作教程视频。
</speak>
```

**应用：** 在线教育、操作指导


### 场景3：信息卡片

```xml
<speak>
  <uievent>
    <type>show_text</type>
    <data>
      <title>重要提示</title>
      <text_content>请确保在操作前备份重要数据。</text_content>
    </data>
  </uievent>
  请注意以下重要提示。
</speak>
```

**应用：** 客服FAQ、操作说明


### 场景4：外部链接

```xml
<speak>
  <uievent>
    <type>show_link</type>
    <data>
      <url>https://www.example.com</url>
      <title>官方网站</title>
    </data>
  </uievent>
  您可以访问我们的官方网站了解更多详情。
</speak>
```

**应用：** 官网引导、资源链接


### 场景5：3D模型展示

```xml
<speak>
  <uievent>
    <type>show_model3d</type>
    <data>
      <model_url>https://example.com/model.glb</model_url>
      <title>产品3D模型</title>
    </data>
  </uievent>
  这是产品的3D模型，您可以360度查看。
</speak>
```

**应用：** 产品展示、建筑设计


### 场景6：多模态组合

```xml
<speak>
  <uievent>
    <type>show_image</type>
    <data>
      <image>https://example.com/image1.jpg</image>
      <title>场景图片</title>
    </data>
  </uievent>
  首先展示场景图片。
  <uievent>
    <type>show_link</type>
    <data>
      <url>https://www.example.com</url>
      <title>相关链接</title>
    </data>
  </uievent>
  然后提供相关链接。
</speak>
```

**应用：** 综合信息展示、多步骤引导

## 事件数据结构

### 通用结构

```typescript
interface IRawWidgetData {
  type: string        // 事件类型（如：show_image、show_video）
  data: any          // 事件数据（自定义结构）
  text?: string      // 字幕文本（如果是字幕事件）
}
```

### 内置事件类型（SDK自动处理）

- `subtitle_on`: 显示字幕
- `subtitle_off`: 隐藏字幕
- `widget_pic`: 背景图片

### 自定义事件类型示例

- `show_image`: 展示图片
- `show_video`: 播放视频
- `show_link`: 展示链接
- `show_model3d`: 展示3D模型
- `show_text`: 展示文本
- `my_custom_event`: 任意自定义事件

## 注意事项

### 1. 回调方式选择

- **优先使用 `proxyWidget`**：只需要处理自定义事件
- **使用 `onWidgetEvent`**：需要完全自定义所有UI渲染

### 2. 数据结构设计

设计清晰的数据结构：

```xml
<uievent>
  <type>show_image</type>
  <data>
    <image>图片URL（必需）</image>
    <title>标题（可选）</title>
  </data>
</uievent>
```

## 完整示例

```javascript
const avatarInstance = new XmovAvatar({
  containerId: '#avatar-container',
  appId: 'your-app-id',
  appSecret: 'your-app-secret',
  gatewayServer: 'https://your-gateway.com/api/session',
  proxyWidget: {
    show_image: (data) => {
      const img = document.createElement('img')
      img.src = data.data.image
      img.alt = data.data.title || '图片'
      document.getElementById('content-area').appendChild(img)
    },
    show_video: (data) => {
      const video = document.createElement('video')
      video.src = data.data.video
      video.controls = true
      document.getElementById('content-area').appendChild(video)
    },
    show_link: (data) => {
      const link = document.createElement('a')
      link.href = data.data.url
      link.textContent = data.data.title || '链接'
      link.target = '_blank'
      document.getElementById('content-area').appendChild(link)
    }
  }
})

// 使用SSML触发事件
avatarInstance.speak(`
<speak>
  <uievent>
    <type>show_image</type>
    <data>
      <image>https://example.com/image.jpg</image>
      <title>产品图片</title>
    </data>
  </uievent>
  这是我们的产品图片。
</speak>
`)
```

## 常见问题

### Q1: 字幕和背景图片不显示？

**A:** 如果使用 `onWidgetEvent`，需要确保不拦截 `subtitle_on` 和 `widget_pic` 事件，或者自己实现渲染逻辑。**推荐使用 `proxyWidget`，SDK会自动处理。**

### Q2: 如何自定义字幕样式？

**A:** 使用 `onWidgetEvent` 接管 `subtitle_on` 事件，然后自己实现字幕渲染逻辑。

### Q3: 可以同时使用两种回调方式吗？

**A:** 不可以，只能选择其中一种。如果同时设置，`onWidgetEvent` 会优先。

### Q4: 事件数据格式有限制吗？

**A:** 没有严格限制，但建议使用JSON兼容的数据格式。

### Q5: 事件触发时机是什么？

**A:** 事件会在数字人说到对应SSML位置时触发，与语音同步。


## 总结

自定义事件功能为数字人应用提供了强大的多模态内容展示能力。

**推荐使用 `proxyWidget` 方式**，让SDK处理字幕和背景图片，您只需要专注于自定义事件的业务逻辑。

**相关资源：**
- 完整示例代码：`apps/web-demo/src/views/CustomEvent.vue`
