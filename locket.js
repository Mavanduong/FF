        y: headPos.y,
        mode: "headlock",
        speed: 999
      };
    }

    $done({ body: JSON.stringify(data) });
  } catch (e) {
    console.log("HEADLOCK ERROR", e);
    $done({});
  }

  // Dummy AI: Ước lượng nhanh từ vị trí thân
  function estimateHeadViaAI(data) {
    let base = data?.enemy?.body_position || { x: 0, y: 0 };
    return Promise.resolve({
      x: base.x,
      y: base.y - 15 // giả định đầu cao hơn thân 15 pixel
    });
  }
})();
