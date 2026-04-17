import React from 'react'

const Tags = ({text, handleChange}) => {
    return (
        <>
            <div className="sm:col-span-2">
                <label htmlFor="tags" className="mb-1 block text-sm font-semibold text-gray-700">
                  Tags
                </label>
                <input
                  id="tags"
                  name="tags"
                  type="text"
                  value={text}
                  onChange={handleChange}
                  placeholder="Tags"
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30"
                />
                <p className="mt-1 text-sm text-gray-500">Having accurate tags will help your model.</p>
              </div></>
    )
}
export default Tags
