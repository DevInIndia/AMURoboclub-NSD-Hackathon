import React from "react";
import "./Advancesearch.css";
const AdvanceSearch = () => {
  return (
    <div className="advanceSection">
      <form className="advanceInputfield">
        <div className="input">
          <p>Temprature</p>
          <input type="number" placeholder="Temprature in Kelvin" />
        </div>
        <div className="input">
          <p>Luminosity</p>
          <input type="number" placeholder="Relative Luminosity" />
        </div>
        <div className="input">
          <p>Abosolute magnitude</p>
          <input type="number" placeholder="Abosolute magnitude" />
        </div>
        <div className="input">
          <p>Color</p>
          <input type="text" placeholder="Color of the star" />
        </div>
        <div className="input">
          <p>Spectral class of the star</p>
          <input type="text" placeholder="Spectral class" />
        </div>
        <div className="input">
          <p>Type of the star</p>
          <select name="Star type" id="startype">
            <option id="type0" value="Brown Dwarf"> Brown Dwarf </option>
            <option id="type1" value="Red Dwarf"> Red Dwarf </option>
            <option id="type2" value="White Dwarf"> White Dwarf </option>
            <option id="type3" value="Main Sequence"> Main Sequence </option>
            <option id="type4" value="SuperGiant"> SuperGiant </option>
            <option id="type5" value="HyperGiant"> HyperGiant </option>
          </select>
        </div>
      </form>
      <button className="Enterinfo">Search</button>
    </div>
  );
};

export default AdvanceSearch;
