import React, { useEffect, useState } from "react";
import axios from "axios";

const Tags = ({ tags, setTags }) => {
  const [text, setText] = useState("");
  const [suggestions, setSuggestions] = useState([]);

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

        // hide already selected tags from suggestions
        const filteredResults = results.filter(
          (item) => !tags.includes(item.tag_name)
        );

        setSuggestions(filteredResults);
      } catch (error) {
        console.log(error.response?.data?.message || "Request failed");
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [text, tags]);

  function addTag(tagName) {
    const cleanTag = tagName.trim();
    if (!cleanTag) return;

    setTags((prev) => {
      if (prev.includes(cleanTag)) return prev;
      return [...prev, cleanTag];
    });

    setText("");
    setSuggestions([]);
  }

  function removeTag(tagToRemove) {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
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
              className="cursor-pointer text-lg font-bold leading-none text-gray-500 hover:text-gray-800"
              aria-label={`Remove ${tag}`}
            >
              X
            </button>
          </div>
        ))}

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a tag"
          className="min-w-30 flex-1 border-none bg-transparent px-1 py-1 outline-none"
        />
      </div>

      <p className="mt-1 text-sm text-gray-500">
        Having accurate tags will help your model.
      </p>

      {suggestions.length > 0 && (
        <ul className="mt-2 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm">
          {suggestions.map((tag) => (
            <li
              key={tag.tag_name}
              className="cursor-pointer px-3 py-2 hover:bg-orange-100"
              onClick={() => addTag(tag.tag_name)}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium text-gray-800">{tag.tag_name}</span>
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