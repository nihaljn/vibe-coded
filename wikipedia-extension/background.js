chrome.runtime.onInstalled.addListener(() => {
  console.log('Wikipedia Tracker extension installed');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openSidePanel') {
    chrome.sidePanel.open({ windowId: sender.tab.windowId });
  } else if (request.action === 'pageChanged') {
    // Relay the message to all extension contexts (including sidepanel)
    console.log('Background: Relaying pageChanged message');
    chrome.runtime.sendMessage(request).catch(() => {
      // Ignore if no listeners
    });
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('wikipedia.org')) {
    chrome.tabs.sendMessage(tabId, {
      action: 'pageLoaded',
      url: tab.url,
      title: tab.title
    }).catch(() => {
      // Ignore errors if content script isn't ready yet
    });
  }
});