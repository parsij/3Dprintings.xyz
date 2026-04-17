import React, {useEffect, useRef, useState} from "react";
import axios from "axios";

const Tags = ({ tags, setTags }) => {
  const [text, setText] = useState("");
  const itemRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
  itemRefs.current[activeIndex]?.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
  });
}, [activeIndex]);

  useEffect(() => {
    if (!text.trim()) {
      setSuggestions([]);
      return;
    }



    const timer = setTimeout(async () => {
      try {
        const response = await axios.get(
          `http://localhost:3000/api/tags?tag=${encodeURIComponent(text)}`
        );

        const results = response.data.tagsAndUses || [];

        const filteredResults = results.filter(
          (item) => !tags.includes(item.tag_name)
        );

        setSuggestions(filteredResults);
        setActiveIndex(0);
      } catch (error) {
        console.log(error.response?.data?.message || "Request failed");
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [text, tags]);

  function highlightMatch(name, query) {
    if (!query) return name;

    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped})`, "i");
    const parts = name.split(re);

    return parts.map((part, i) =>
      re.test(part) ? (
        <strong key={i} className="font-bold text-black">
          {part}
        </strong>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  }

  function addTag(tagName) {
    const cleanTag = tagName.trim();
    if (!cleanTag) return;

    setTags((prev) => {
      if (prev.includes(cleanTag)) return prev;
      return [...prev, cleanTag];
    });

    setText("");
    setSuggestions([]);
    setActiveIndex(0);
  }

  function removeTag(tagToRemove) {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  }

  function handleKeyDown(e) {
    if (!suggestions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }

    if (e.key === "Enter" && suggestions[activeIndex]) {
      e.preventDefault();
      addTag(suggestions[activeIndex].tag_name);
    }
  }

  return (
    <div className="sm:col-span-2">
      <label className="mb-1 block text-sm font-semibold text-gray-700">
        Tags
      </label>

      <div className="flex min-h-13 flex-wrap items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30">
        {tags.map((tag) => (
          <div
            key={tag}
            className="flex items-center gap-2 rounded-lg bg-gray-200 px-3 py-1 text-sm text-gray-800"
          >
            <span>{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="cursor-pointer text-lg font-semibold leading-none text-gray-500 hover:text-gray-800"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </div>
        ))}

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a tag"
          className="min-w-30 flex-1 border-none bg-transparent px-1 py-1 outline-none"
        />
      </div>

      <p className="mt-1 text-sm text-gray-500">
        Having accurate tags will help your model.
      </p>

      {suggestions.length > 0 && (
        <ul className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          {suggestions.map((tag, index) => (
            <li
                ref={(el) => (itemRefs.current[index] = el)}
              key={tag.tag_name}
              className={`cursor-pointer px-3 py-2 ${
                index === activeIndex ? "bg-orange-100" : "hover:bg-orange-100"
              }`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => addTag(tag.tag_name)}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium text-gray-800">
                  {highlightMatch(tag.tag_name, text)}
                </span>
                <span className="text-sm text-gray-500">{tag.uses} uses</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Tags;