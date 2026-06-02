(function () {
  if (!/github\.io$/i.test(location.hostname)) return;
  var bar = document.createElement("p");
  bar.className = "gh-preview-bar";
  bar.textContent = "GitHub Pages preview — breakcore.com.au DNS still pending at registrar.";
  var page = document.querySelector(".page");
  if (page) page.insertBefore(bar, page.firstChild);
})();
